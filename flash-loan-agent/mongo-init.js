// MongoDB initialization script
db = db.getSiblingDB('flash_loan_db');

// Create collections
db.createCollection('flash_loan_agent');
db.createCollection('strategies');
db.createCollection('transactions');

// Create indexes for better performance
db.flash_loan_agent.createIndex({ "session_id": 1 });
db.flash_loan_agent.createIndex({ "user_id": 1 });
db.flash_loan_agent.createIndex({ "created_at": 1 });

db.strategies.createIndex({ "strategy_id": 1 });
db.strategies.createIndex({ "user_id": 1 });
db.strategies.createIndex({ "status": 1 });

db.transactions.createIndex({ "transaction_hash": 1 });
db.transactions.createIndex({ "strategy_id": 1 });
db.transactions.createIndex({ "timestamp": 1 });

// Create a user for the application
db.createUser({
  user: "app_user",
  pwd: "app_password",
  roles: [
    {
      role: "readWrite",
      db: "flash_loan_db"
    }
  ]
});

print("Database initialization completed!");
