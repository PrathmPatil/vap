
// models/otherDataUnknownSection.js
export default function OtherDataUnknownSectionModel(sequelize, DataTypes) {
  return sequelize.define(
    'other_data_unknown_section',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      symbol: { type: DataTypes.TEXT, allowNull: true, primaryKey: true },
      key: { type: DataTypes.TEXT, allowNull: true },
      value: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'other_data_unknown_section',
      timestamps: false,
      freezeTableName: true,
    }
  );
}
