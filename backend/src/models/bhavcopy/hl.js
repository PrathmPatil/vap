// models/hl.js
export default function HLModel(sequelize, DataTypes) {
  return sequelize.define('hl', {
    SECURITY: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    NEW: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    PREVIOUS: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    NEW_STATUS: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'hl',
    timestamps: false,
  });
}
