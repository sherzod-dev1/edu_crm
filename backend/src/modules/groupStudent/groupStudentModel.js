module.exports = (sequelize, DataTypes) => {
    const GroupStudent = sequelize.define("GroupStudent", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        group_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        student_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        joined_at: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
        left_at: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
    }, {
        tableName: "group_students",
        timestamps: true,
        underscored: true,
    });

    GroupStudent.associate = (models) => {
        if (models.Group) {
            GroupStudent.belongsTo(models.Group, { foreignKey: "group_id", as: "group" });
        }
        if (models.Student) {
            GroupStudent.belongsTo(models.Student, { foreignKey: "student_id", as: "student" });
        }
    };

    return GroupStudent;
};
