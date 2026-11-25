module.exports = (sequelize, DataTypes) => {
    const Branch = sequelize.define("Branch", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(150),
            allowNull: true,
            validate: {
                isEmail: true,
            },
        },
        manager_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
        plan: {
            type: DataTypes.STRING(50),
            defaultValue: 'Standart',
            allowNull: true,
        },
        payment_type: {
            type: DataTypes.STRING(50),
            defaultValue: "Oylik to'lov",
            allowNull: true,
        },
        max_students: {
            type: DataTypes.INTEGER,
            defaultValue: 300,
            allowNull: true,
        },
        modules: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName: "branches",
        timestamps: true,
        underscored: true,
    });

    Branch.associate = (models) => {
        if (models.User) {
            Branch.belongsTo(models.User, { foreignKey: "manager_id", as: "manager" });
        }
    };

    return Branch;
};
