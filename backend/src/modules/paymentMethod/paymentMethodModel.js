module.exports = (sequelize, DataTypes) => {
    const PaymentMethod = sequelize.define("PaymentMethod", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
    }, {
        tableName: "payment_methods",
        timestamps: true,
        underscored: true,
    });

    PaymentMethod.associate = (models) => {
        // Kelajakda Payment modeli bilan bog'lash uchun joy
        if (models.Payment) {
            PaymentMethod.hasMany(models.Payment, { foreignKey: "payment_method_id", as: "payments" });
        }
    };

    return PaymentMethod;
};
