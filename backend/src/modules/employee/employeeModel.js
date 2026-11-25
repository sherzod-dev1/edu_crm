module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define("Employee", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        position: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        salary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        hire_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
    }, {
        tableName: "employees",
        timestamps: true,
        underscored: true,
    });

    Employee.associate = (models) => {
        if (models.User) {
            Employee.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
        }
        if (models.Branch) {
            Employee.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
    };

    return Employee;
};
