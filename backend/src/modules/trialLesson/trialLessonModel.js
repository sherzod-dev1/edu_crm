module.exports = (sequelize, DataTypes) => {
    const TrialLesson = sequelize.define("TrialLesson", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        lead_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        course_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        teacher_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        branch_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        classroom_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        trial_date: {
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
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'scheduled',
            allowNull: false,
        },
        feedback: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
    }, {
        tableName: "trial_lessons",
        timestamps: true,
        underscored: true,
    });

    TrialLesson.associate = (models) => {
        if (models.Lead) {
            TrialLesson.belongsTo(models.Lead, { foreignKey: "lead_id", as: "lead" });
        }
        if (models.Course) {
            TrialLesson.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
        }
        if (models.Teacher) {
            TrialLesson.belongsTo(models.Teacher, { foreignKey: "teacher_id", as: "teacher" });
        }
        if (models.Branch) {
            TrialLesson.belongsTo(models.Branch, { foreignKey: "branch_id", as: "branch" });
        }
        if (models.Classroom) {
            TrialLesson.belongsTo(models.Classroom, { foreignKey: "classroom_id", as: "classroom" });
        }
        if (models.User) {
            TrialLesson.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
        }
    };

    return TrialLesson;
};
