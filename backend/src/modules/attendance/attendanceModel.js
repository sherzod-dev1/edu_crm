module.exports = (sequelize, DataTypes) => {
    const Attendance = sequelize.define("Attendance", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        lesson_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        student_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'present',
            allowNull: false,
        },
        note: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        marked_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        marked_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: "attendances",
        timestamps: true,
        underscored: true,
    });

    Attendance.associate = (models) => {
        if (models.Lesson) {
            Attendance.belongsTo(models.Lesson, { foreignKey: "lesson_id", as: "lesson" });
        }
        if (models.Student) {
            Attendance.belongsTo(models.Student, { foreignKey: "student_id", as: "student" });
        }
        if (models.User) {
            Attendance.belongsTo(models.User, { foreignKey: "marked_by", as: "marker" });
        }
    };

    return Attendance;
};
