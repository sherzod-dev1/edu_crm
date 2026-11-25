module.exports = (sequelize, DataTypes) => {
    const Lesson = sequelize.define("Lesson", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        group_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        teacher_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        classroom_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        module_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        lesson_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        topic: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'planned',
            allowNull: false,
        },
    }, {
        tableName: "lessons",
        timestamps: true,
        underscored: true,
    });

    Lesson.associate = (models) => {
        if (models.Group) {
            Lesson.belongsTo(models.Group, { foreignKey: "group_id", as: "group" });
        }
        if (models.Teacher) {
            Lesson.belongsTo(models.Teacher, { foreignKey: "teacher_id", as: "teacher" });
        }
        if (models.Classroom) {
            Lesson.belongsTo(models.Classroom, { foreignKey: "classroom_id", as: "classroom" });
        }
        if (models.CourseModule) {
            Lesson.belongsTo(models.CourseModule, { foreignKey: "module_id", as: "module" });
        }
        if (models.Attendance) {
            Lesson.hasMany(models.Attendance, { foreignKey: "lesson_id", as: "attendances" });
        }
    };

    return Lesson;
};
