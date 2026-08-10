export default function UserScanAlertModel(sequelize, DataTypes) {
  return sequelize.define(
    'user_scan_alerts',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      scan_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      channel: { type: DataTypes.STRING(20), allowNull: false },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'queued',
      },
      recipient: { type: DataTypes.STRING(255), allowNull: true },
      message: { type: DataTypes.TEXT, allowNull: true },
      match_count: { type: DataTypes.INTEGER, allowNull: true },
      trade_date: { type: DataTypes.DATEONLY, allowNull: true },
      error_message: { type: DataTypes.TEXT, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'user_scan_alerts',
      timestamps: false,
      indexes: [{ fields: ['user_id'] }, { fields: ['scan_id'] }],
    }
  );
}
