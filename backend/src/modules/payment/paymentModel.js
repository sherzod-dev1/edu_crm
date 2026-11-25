module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define("Payment", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        student_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        invoice_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        payment_method_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        transaction_id: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        payment_date: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'completed',
            allowNull: false,
        },
        note: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
    }, {
        tableName: "payments",
        timestamps: true,
        underscored: true,
    });

    Payment.associate = (models) => {
        if (models.Student) {
            Payment.belongsTo(models.Student, { foreignKey: "student_id", as: "student" });
        }
        if (models.Invoice) {
            Payment.belongsTo(models.Invoice, { foreignKey: "invoice_id", as: "invoice" });
        }
        if (models.PaymentMethod) {
            Payment.belongsTo(models.PaymentMethod, { foreignKey: "payment_method_id", as: "payment_method" });
        }
        if (models.User) {
            Payment.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
        }
    };

    return Payment;
};
