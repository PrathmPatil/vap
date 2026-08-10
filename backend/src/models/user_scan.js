export default function UserScanModel(sequelize, DataTypes) {
  return sequelize.define(
    'user_scans',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      formula_type: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: 'strong-bullish-candle',
      },
      base_percent: { type: DataTypes.DOUBLE, allowNull: true },
      change_percent_min: { type: DataTypes.DOUBLE, allowNull: true },
      change_percent_max: { type: DataTypes.DOUBLE, allowNull: true },
      change_sort: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'desc',
      },
      symbol: { type: DataTypes.STRING(50), allowNull: true },
      notify_email: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      notify_whatsapp: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      alert_email: { type: DataTypes.STRING(255), allowNull: true },
      alert_whatsapp: { type: DataTypes.STRING(20), allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_match_count: { type: DataTypes.INTEGER, allowNull: true },
      last_notified_at: { type: DataTypes.DATE, allowNull: true },
      last_trade_date: { type: DataTypes.DATEONLY, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'user_scans',
      timestamps: false,
      indexes: [{ fields: ['user_id'] }, { fields: ['formula_type'] }],
    }
  );
}
