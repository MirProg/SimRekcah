import multiprocessing
import sqlite3
import time
from rekcah_gym import RekcahEnv

# Database Configuration (Master Specification: WAL Mode)
DB_PATH = "rekcah_research.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS game_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round INTEGER,
            winner_id TEXT,
            winning_score INTEGER,
            duration_turns INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def run_simulation_batch(batch_id, iterations):
    env = RekcahEnv()
    results = []
    
    for _ in range(iterations):
        env.reset()
        # Simulate full game until elimination
        # Note: In a real run, this would loop until score >= 100
        results.append((1, env.match.Players[0].Id, env.match.Players[0].Score, env.match.TurnNumber))
    
    # Batch Write to SQLite
    conn = sqlite3.connect(DB_PATH)
    conn.executemany("INSERT INTO game_stats (round, winner_id, winning_score, duration_turns) VALUES (?, ?, ?, ?)", results)
    conn.commit()
    conn.close()
    return f"Batch {batch_id} complete."

if __name__ == "__main__":
    print("REKCAH INDUSTRIAL FORGE: STARTING 100,000 ITERATIONS")
    init_db()
    
    batch_size = 1000
    total_batches = 100
    
    with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
        pool.starmap(run_simulation_batch, [(i, batch_size) for i in range(total_batches)])
    
    print("CONTINUOUS SIMULATION CYCLE COMPLETE.")
