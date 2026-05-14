export default (sequelize, DataTypes) => {

  const CronJobLog = sequelize.define(
    'cron_job_logs',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },

      job_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },

      job_group: {
        type: DataTypes.STRING(100),
        allowNull: true
      },

      start_time: {
        type: DataTypes.DATE,
        allowNull: false
      },

      end_time: {
        type: DataTypes.DATE,
        allowNull: true
      },

      duration_seconds: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true
      },

      status: {
        type: DataTypes.ENUM(
          'RUNNING',
          'SUCCESS',
          'FAILED',
          'SKIPPED'
        ),
        allowNull: false,
        defaultValue: 'RUNNING'
      },

      records_processed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },

      records_inserted: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },

      records_updated: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },

      error_message: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      error_traceback: {
        type: DataTypes.TEXT('long'),
        allowNull: true
      },

      additional_data: {
        type: DataTypes.JSON,
        allowNull: true
      },

      created_at: {
        type: DataTypes.DATE
      },

      updated_at: {
        type: DataTypes.DATE
      }
    },
    {
      tableName: 'cron_job_logs',

      timestamps: true,

      createdAt: 'created_at',

      updatedAt: 'updated_at',

      indexes: [
        {
          name: 'idx_job_name',
          fields: ['job_name']
        },

        {
          name: 'idx_status',
          fields: ['status']
        },

        {
          name: 'idx_start_time',
          fields: ['start_time']
        },

        {
          name: 'idx_job_group',
          fields: ['job_group']
        }
      ]
    }
  );

  return CronJobLog;

};