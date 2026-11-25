module.exports = (sequelize, DataTypes) => {
    const StudentGrade = sequelize.define("StudentGrade", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        student_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        teacher_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        group_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        lesson_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING(30),
            allowNull: false, // 'homework' | 'activity'
            validate: {
                isIn: [['homework', 'activity']]
            }
        },
        score: {
            type: DataTypes.INTEGER,
            allowNull: false, // 0 - 100
            validate: {
                min: 0,
                max: 100
            }
        },
        coins: {
            type: DataTypes.INTEGER,
            allowNull: false, // 1 score = 1 coin
            defaultValue: 0
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
    }, {
        tableName: "student_grades",
        timestamps: true,
        underscored: true,
    });

    StudentGrade.associate = (models) => {
        if (models.Student) {
            StudentGrade.belongsTo(models.Student, { foreignKey: "student_id", as: "student" });
        }
        if (models.Teacher) {
            StudentGrade.belongsTo(models.Teacher, { foreignKey: "teacher_id", as: "teacher" });
        }
        if (models.Group) {
            StudentGrade.belongsTo(models.Group, { foreignKey: "group_id", as: "group" });
        }
        if (models.Lesson) {
            StudentGrade.belongsTo(models.Lesson, { foreignKey: "lesson_id", as: "lesson" });
        }
        if (models.User) {
            StudentGrade.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
        }
    };

    return StudentGrade;
};

