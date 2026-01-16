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

      // FIX: TEXT → STRING(50), remove primaryKey
      symbol: { type: DataTypes.STRING(50), allowNull: true },

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
