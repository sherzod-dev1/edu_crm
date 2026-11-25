module.exports = (sequelize, DataTypes) => {
    const ExamResult = sequelize.define("ExamResult", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        exam_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        student_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        score: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
        },
        percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
        },
        grade: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        passed: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
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
        tableName: "exam_results",
        timestamps: true,
        underscored: true,
    });

    ExamResult.associate = (models) => {
        if (models.Exam) {
            ExamResult.belongsTo(models.Exam, { foreignKey: "exam_id", as: "exam" });
        }
        if (models.Student) {
            ExamResult.belongsTo(models.Student, { foreignKey: "student_id", as: "student" });
        }
        if (models.User) {
            ExamResult.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
        }
    };

    return ExamResult;
};
