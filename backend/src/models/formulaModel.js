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
  return sequelize.define(
    'VolumeBreakout',
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



// models/TweezerBottom.js
export const TweezerBottom = (sequelize, DataTypes) => {
  return sequelize.define(
    'TweezerBottom',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      security: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Stock security code/symbol'
      },

      trade_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Date when pattern was identified'
      },

      close_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Closing price on trade date'
      },

      pattern_name: {
        type: DataTypes.STRING(50),
        defaultValue: 'Tweezer Bottom',
        comment: 'Name of the detected pattern'
      },

      // Pattern metrics for analysis
      low_diff_percentage: {
        type: DataTypes.DECIMAL(8, 4),
        comment: 'Percentage difference between previous and current low'
      },

      prev_body_strength: {
        type: DataTypes.DECIMAL(8, 4),
        comment: 'Previous candle body strength percentage'
      },

      curr_body_strength: {
        type: DataTypes.DECIMAL(8, 4),
        comment: 'Current candle body strength percentage'
      },

      volume_ratio_prev: {
        type: DataTypes.DECIMAL(8, 2),
        comment: 'Previous day volume vs 20-day average'
      },

      volume_ratio_curr: {
        type: DataTypes.DECIMAL(8, 2),
        comment: 'Current day volume vs 20-day average'
      },

      prev_close: {
        type: DataTypes.DECIMAL(12, 2),
        comment: 'Previous day closing price'
      },

      prev_open: {
        type: DataTypes.DECIMAL(12, 2),
        comment: 'Previous day opening price'
      },

      prev_low: {
        type: DataTypes.DECIMAL(12, 2),
        comment: 'Previous day low price'
      },

      curr_open: {
        type: DataTypes.DECIMAL(12, 2),
        comment: 'Current day opening price'
      },

      curr_low: {
        type: DataTypes.DECIMAL(12, 2),
        comment: 'Current day low price'
      },

      sma_20: {
        type: DataTypes.DECIMAL(12, 4),
        comment: '20-day Simple Moving Average'
      },

      signal_strength: {
        type: DataTypes.ENUM('Weak', 'Moderate', 'Strong', 'Very Strong'),
        defaultValue: 'Moderate',
        comment: 'Overall pattern strength based on metrics'
      },

      is_confirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether pattern was confirmed by next day price action'
      },

      next_day_return: {
        type: DataTypes.DECIMAL(10, 4),
        comment: 'Return percentage on the next trading day'
      },

      status: {
        type: DataTypes.ENUM('Active', 'Completed', 'Failed'),
        defaultValue: 'Active',
        comment: 'Pattern status for backtesting'
      },

      notes: {
        type: DataTypes.TEXT,
        comment: 'Additional notes or observations'
      }

    },
    {
      tableName: 'tweezer_bottom_signals',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      
      indexes: [
        { fields: ['security', 'trade_date'], unique: true },
        { fields: ['trade_date'] },
        { fields: ['security'] },
        { fields: ['signal_strength'] },
        { fields: ['status'] },
        { fields: ['trade_date', 'signal_strength'] }
      ],
      
      hooks: {
        beforeCreate: async (signal, options) => {
          // Auto-calculate signal strength based on metrics
          let strength = 'Moderate';
          let score = 0;
          
          if (signal.low_diff_percentage <= 0.2) score += 2;
          else if (signal.low_diff_percentage <= 0.5) score += 1;
          
          if (signal.prev_body_strength >= 0.9) score += 2;
          else if (signal.prev_body_strength >= 0.75) score += 1;
          
          if (signal.curr_body_strength >= 0.9) score += 2;
          else if (signal.curr_body_strength >= 0.75) score += 1;
          
          if (signal.volume_ratio_prev >= 1.5) score += 1;
          if (signal.volume_ratio_curr >= 1.5) score += 1;
          
          if (score >= 6) strength = 'Very Strong';
          else if (score >= 4) strength = 'Strong';
          else if (score >= 2) strength = 'Moderate';
          else strength = 'Weak';
          
          signal.signal_strength = strength;
        }
      }
    }
  );
};

