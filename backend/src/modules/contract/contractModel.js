module.exports = (sequelize, DataTypes) => {
  const Contract = sequelize.define("Contract", {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    contract_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    admin_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    super_admin_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    branch_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    center_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    plan: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Standart', // 'Standart' or 'Premium'
    },
    monthly_amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 1200000.00, // 1 200 000 for Standart, 1 800 000 for Premium
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    billing_cycle: {
      type: DataTypes.STRING(50),
      defaultValue: "Oylik to'lov",
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'active', // 'active', 'expiring_soon', 'expired', 'cancelled'
    },
    payment_status: {
      type: DataTypes.STRING(50),
      defaultValue: 'paid', // 'paid', 'unpaid', 'pending'
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    tableName: "contracts",
    timestamps: true,
    underscored: true
  });

  Contract.associate = (models) => {
    if (models.User) {
      Contract.belongsTo(models.User, { foreignKey: "admin_id", as: "admin" });
      Contract.belongsTo(models.User, { foreignKey: "super_admin_id", as: "super_admin" });
    }
    if (models.Branch) {
      Contract.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
    }
  };

  return Contract;
};
