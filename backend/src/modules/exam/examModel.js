module.exports = (sequelize, DataTypes) => {
    const Exam = sequelize.define("Exam", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        course_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        group_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        module_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        teacher_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        title: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        exam_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        max_score: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 100.00,
        },
        passing_score: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 60.00,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'planned',
            allowNull: false,
        },
        questions_file: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
        file_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        file_size: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
    }, {
        tableName: "exams",
        timestamps: true,
        underscored: true,
    });

    Exam.associate = (models) => {
        if (models.Course) {
            Exam.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
        }
        if (models.Group) {
            Exam.belongsTo(models.Group, { foreignKey: "group_id", as: "group" });
        }
        if (models.CourseModule) {
            Exam.belongsTo(models.CourseModule, { foreignKey: "module_id", as: "module" });
        }
        if (models.Teacher) {
            Exam.belongsTo(models.Teacher, { foreignKey: "teacher_id", as: "teacher" });
        }
        if (models.ExamResult) {
            Exam.hasMany(models.ExamResult, { foreignKey: "exam_id", as: "results" });
        }
    };

    return Exam;
};
