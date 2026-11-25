module.exports = (sequelize, DataTypes) => {
    const Lead = sequelize.define("Lead", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        assigned_to: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        full_name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        source: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        interested_course_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'new',
            allowNull: false,
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        next_follow_up: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        converted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: "leads",
        timestamps: true,
        underscored: true,
    });

    Lead.associate = (models) => {
        if (models.Branch) {
            Lead.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
        if (models.User) {
            Lead.belongsTo(models.User, { foreignKey: "assigned_to", as: "assigned_user" });
        }
        if (models.Course) {
            Lead.belongsTo(models.Course, { foreignKey: "interested_course_id", as: "interested_course" });
        }
    };

    return Lead;
};
