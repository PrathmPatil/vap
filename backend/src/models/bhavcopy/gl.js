// models/gl.js
export default function GLModel(sequelize, DataTypes) {
  return sequelize.define('gl', {
    GAIN_LOSS: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SECURITY: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    CLOSE_PRIC: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    PREV_CL_PR: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    PERCENT_CG: {
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
    tableName: 'gl',
    timestamps: false,
  });
}
