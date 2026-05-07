// models/watchlist.js
export default function WatchlistModel(sequelize, DataTypes) {
  return sequelize.define(
    'watchlist',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      symbol: { type: DataTypes.STRING(50), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    {
      tableName: 'watchlist',
      timestamps: false,
      indexes: [{ fields: ['user_id'] }, { fields: ['symbol'] }]
    }
  );
}
