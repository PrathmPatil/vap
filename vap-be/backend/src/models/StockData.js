// backend/src/models/StockData.js
export default (sequelize, DataTypes) => {
  const StockData = sequelize.define(
    "StockData",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      symbol: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      open: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      high: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      low: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      close: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      volume: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "nse_prices", // maps to your MySQL table
      timestamps: false,       // disable Sequelize auto timestamps
    }
  );

  return StockData;
};
