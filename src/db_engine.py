"""
db_engine.py — DuckDB connection manager and DataPackage loader.
Scans data/**/datapackage*.yml|json, registers CSV/GeoJSON as views.
"""
import duckdb
import os
import yaml
import json
import glob

def get_connection():
    """Create a DuckDB in-memory connection with the spatial extension."""
    conn = duckdb.connect(':memory:')
    conn.execute("INSTALL spatial;")
    conn.execute("LOAD spatial;")
    return conn


def load_datapackages(_conn):
    """
    Discover all datapackages, register each resource as a DuckDB view,
    and return table metadata.

    Returns:
        tables_info: dict[table_name -> schema DataFrame]
        schema_text: str  — human-readable schema for the LLM prompt
    """
    tables_info = {}
    schema_lines = []

    dp_files = (
        glob.glob('data/**/datapackage*.yml', recursive=True)
        + glob.glob('data/**/datapackage*.yaml', recursive=True)
        + glob.glob('data/**/datapackage*.json', recursive=True)
    )

    for dp_file in dp_files:
        try:
            with open(dp_file, 'r', encoding='utf-8') as f:
                dp = yaml.safe_load(f) if dp_file.endswith(('.yml', '.yaml')) else json.load(f)

            for res in dp.get('resources', []):
                path = res.get('path', '')
                if not path or not os.path.exists(path):
                    continue

                base_name = os.path.basename(path).split('.')[0]
                table_name = f"{os.path.basename(os.path.dirname(dp_file))}_{base_name}".replace('-', '_')

                if path.endswith('.csv'):
                    _conn.execute(f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_csv_auto('{path}')")
                elif path.endswith('.geojson'):
                    _conn.execute(f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM st_read('{path}')")
                elif path.endswith('.parquet'):
                    _conn.execute(f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_parquet('{path}')")
                else:
                    continue

                schema = _conn.execute(f"DESCRIBE {table_name}").df()
                tables_info[table_name] = schema

                header = f"Table: {table_name}\nColumns:"
                cols = "\n".join(f"  - {r['column_name']} ({r['column_type']})" for _, r in schema.iterrows())
                schema_lines.append(f"{header}\n{cols}")

        except Exception as e:
            print(f"[db_engine] Error loading {dp_file}: {e}")

    return tables_info, "\n\n".join(schema_lines)
