module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("User", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        hashed_password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        plain_password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        hashed_refresh_token: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: 'STAFF',
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'active',
        },
        avatar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    }, {
        tableName: "users",
        timestamps: true,
        underscored: true
    });

    User.associate = (models) => {
        if (models.Branch) User.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        if (models.Employee) User.hasOne(models.Employee, { foreignKey: "user_id", as: "employee_profile" });
        if (models.Teacher) User.hasOne(models.Teacher, { foreignKey: "user_id", as: "teacher_profile" });
        if (models.Notification) User.hasMany(models.Notification, { foreignKey: "user_id", as: "notifications" });
    };

    return User;
};


