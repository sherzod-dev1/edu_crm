module.exports = (sequelize, DataTypes) => {
    const Activity = sequelize.define("Activity", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        action: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        entity_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        entity_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
    }, {
        tableName: "activities",
        timestamps: true,
        updatedAt: false,
        underscored: true,
    });

    Activity.associate = (models) => {
        if (models.User) {
            Activity.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
        }
    };

    return Activity;
};
