/*
---------------------------------------------------
Rally Attempt Day
---------------------------------------------------
*/
export const RallyAttemptDay = (sequelize, DataTypes) => {
  return sequelize.define(
    'RallyAttemptDay',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },

      security: {
        type: DataTypes.STRING(255),
        allowNull: false
      },

      symbol: {
        type: DataTypes.STRING(50),
        allowNull: false
      },

      rally_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      close_price: {
        type: DataTypes.DOUBLE,
        allowNull: false
      },

      status: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'rally_detected'
      }
    },
    {
      tableName: 'rally_attempt_day',

      timestamps: true,

      createdAt: 'created_at',
      updatedAt: 'updated_at',

      indexes: [
        {
          name: 'idx_rally_symbol',
          fields: ['symbol']
        },

        {
          name: 'idx_rally_date',
          fields: ['rally_date']
        },

        {
          name: 'idx_rally_symbol_date',
          unique: true,
          fields: ['symbol', 'rally_date']
        }
      ]
    }
  );
};
/*
---------------------------------------------------
Follow Through Day
---------------------------------------------------
*/
export const FollowThroughDay = (sequelize, DataTypes) => {
  return sequelize.define(
    'FollowThroughDay',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      symbol: {
        type: DataTypes.STRING(255)
      },
      rally_date: {
        type: DataTypes.DATEONLY
      },
      ftd_date: {
        type: DataTypes.DATEONLY
      },
      change_percent: {
        type: DataTypes.DOUBLE
      },
      volume: {
        type: DataTypes.BIGINT
      },
      status: {
        type: DataTypes.STRING(100)
      }
    },
    {
      tableName: 'follow_throught_day',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['symbol'] }]
    }
  );
};

/*
---------------------------------------------------
Buy Day
---------------------------------------------------
*/
export const BuyDay = (sequelize, DataTypes) => {
  return sequelize.define(
    'BuyDay',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      symbol: {
        type: DataTypes.STRING(255)
      },
      rally_date: {
        type: DataTypes.DATEONLY
      },
      ftd_date: {
        type: DataTypes.DATEONLY
      },
      buy_date: {
        type: DataTypes.DATEONLY
      },
      breakout_price: {
        type: DataTypes.DOUBLE
      },
      status: {
        type: DataTypes.STRING(100)
      }
    },
    {
      tableName: 'buy_day',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['symbol'] }]
    }
  );
};

/*
---------------------------------------------------
Strong Bullish Candle
---------------------------------------------------
*/

export const StrongBullishCandle = (sequelize, DataTypes) => {
  return sequelize.define(
    'StrongBullishCandle',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      security: {
        type: DataTypes.STRING(255)
      },
      open_price: {
        type: DataTypes.DOUBLE
      },
      close_price: {
        type: DataTypes.DOUBLE
      },
      change_percent: {
        type: DataTypes.DOUBLE
      },
      trade_date: {
        type: DataTypes.DATEONLY
      },
      base_percent: {
        type: DataTypes.DOUBLE
      }
    },
    {
      tableName: 'strong_bullish_candle',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['security', 'trade_date'] }]
    }
  );
};

/* =========================================================
    Volume Breakout
========================================================= */
export const VolumeBreakout = (sequelize, DataTypes) => {
  sequelize.define(
    'StrongBullishCandle',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      security: DataTypes.STRING,
      symbol: DataTypes.STRING,

      trade_date: DataTypes.DATE,

      close_price: DataTypes.FLOAT,
      volume: DataTypes.BIGINT,

      avg_volume_10d: DataTypes.BIGINT,

      volume_ratio: DataTypes.FLOAT
    },
    {
      tableName: 'volume_breakout',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['security', 'trade_date'] }]
    }
  );
};
