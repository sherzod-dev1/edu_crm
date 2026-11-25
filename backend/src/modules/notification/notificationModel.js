module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define("Notification", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'info',
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        read_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: "notifications",
        timestamps: true,
        updatedAt: false,
        underscored: true,
    });

    Notification.associate = (models) => {
        if (models.User) {
            Notification.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
        }
    };

    return Notification;
};
