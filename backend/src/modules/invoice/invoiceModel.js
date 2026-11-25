module.exports = (sequelize, DataTypes) => {
    const Invoice = sequelize.define("Invoice", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        student_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        group_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        invoice_number: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        paid_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        due_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        due_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'unpaid',
            allowNull: false,
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
    }, {
        tableName: "invoices",
        timestamps: true,
        underscored: true,
    });

    Invoice.associate = (models) => {
        if (models.Student) {
            Invoice.belongsTo(models.Student, { foreignKey: "student_id", as: "student" });
        }
        if (models.Group) {
            Invoice.belongsTo(models.Group, { foreignKey: "group_id", as: "group" });
        }
        if (models.User) {
            Invoice.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
        }
        if (models.Payment) {
            Invoice.hasMany(models.Payment, { foreignKey: "invoice_id", as: "payments" });
        }
    };

    return Invoice;
};
