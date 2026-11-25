module.exports = (sequelize, DataTypes) => {
    const MarketOrder = sequelize.define("MarketOrder", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        student_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        item_key: {
            type: DataTypes.STRING(50),
            allowNull: false, // 'notebook' | 'cup' | 'pen_set' | 'tshirt' | 'hoodie'
        },
        item_name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        coins_spent: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'pending', // 'pending' | 'delivered' | 'cancelled'
            allowNull: false,
        },
        coins_deducted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        ordered_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        processed_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        processed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        admin_note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: "market_orders",
        timestamps: true,
        underscored: true,
    });

    MarketOrder.associate = (models) => {
        if (models.Student) {
            MarketOrder.belongsTo(models.Student, { foreignKey: "student_id", as: "student" });
        }
        if (models.User) {
            MarketOrder.belongsTo(models.User, { foreignKey: "processed_by", as: "processor" });
        }
    };

    return MarketOrder;
};

