module.exports = (sequelize, DataTypes) => {
    const Course = sequelize.define("Course", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        teacher_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING(180),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        duration_months: {
            type: DataTypes.SMALLINT,
            allowNull: true,
            defaultValue: 1,
        },
        price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        level: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'Beginner',
        },
        image: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
        lesson_time: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        start_time: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        days: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
    }, {
        tableName: "courses",
        timestamps: true,
        underscored: true,
    });

    Course.associate = (models) => {
        if (models.Branch) {
            Course.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
        if (models.Teacher) {
            Course.belongsTo(models.Teacher, { foreignKey: "teacher_id", as: "teacher" });
        }
        if (models.CourseModule) {
            Course.hasMany(models.CourseModule, { foreignKey: "course_id", as: "modules" });
        }
        if (models.Group) {
            Course.hasMany(models.Group, { foreignKey: "course_id", as: "groups" });
        }
        if (models.TrialLesson) {
            Course.hasMany(models.TrialLesson, { foreignKey: "course_id", as: "trial_lessons" });
        }
        if (models.Lead) {
            Course.hasMany(models.Lead, { foreignKey: "interested_course_id", as: "leads" });
        }
        if (models.Exam) {
            Course.hasMany(models.Exam, { foreignKey: "course_id", as: "exams" });
        }
        if (models.Certificate) {
            Course.hasMany(models.Certificate, { foreignKey: "course_id", as: "certificates" });
        }
    };

    return Course;
};
