
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
          type: DataTypes.STRING(255)
        },
        job_group: {
          type: DataTypes.STRING(100)
        },
        start_time: {
          type: DataTypes.DATE
        },
        end_time: {
          type: DataTypes.DATE
        },
        duration_seconds: {
          type: DataTypes.DECIMAL(10, 3)
        },
        status: {
          type: DataTypes.ENUM('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED')
        },
        records_processed: {
          type: DataTypes.INTEGER
        },
        records_inserted: {
          type: DataTypes.INTEGER
        },
        records_updated: {
          type: DataTypes.INTEGER
        },
        error_message: {
          type: DataTypes.TEXT
        },
        error_traceback: {
          type: DataTypes.TEXT
        },
        additional_data: {
          type: DataTypes.JSON
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
          unique: true,
          fields: ['job_name']
        },
        {
          fields: ['status']
        },
        {
          fields: ['job_group']
        },
        {
          fields: ['job_name', 'status']
        },
        {
          fields: ['job_group', 'status']
        }
      ]
    }
  );
  return CronJobLog;
};
