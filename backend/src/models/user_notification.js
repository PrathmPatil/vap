export default function UserNotificationModel(sequelize, DataTypes) {
  return sequelize.define(
    'user_notifications',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      type: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'info',
      },
      title: { type: DataTypes.STRING(180), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: true },
      link: { type: DataTypes.STRING(255), allowNull: true },
      scan_id: { type: DataTypes.INTEGER, allowNull: true },
      match_count: { type: DataTypes.INTEGER, allowNull: true },
      trade_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      read_at: { type: DataTypes.DATE, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'user_notifications',
      timestamps: false,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'is_read'] },
        { fields: ['created_at'] },
      ],
    }
  );
}
