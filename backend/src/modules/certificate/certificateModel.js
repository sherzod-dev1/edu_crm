module.exports = (sequelize, DataTypes) => {
    const Certificate = sequelize.define("Certificate", {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        student_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        course_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        certificate_number: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        title: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        issue_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
        expiry_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        file_url: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        verification_code: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
        },
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            allowNull: false,
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
    }, {
        tableName: "certificates",
        timestamps: true,
        underscored: true,
    });

    Certificate.associate = (models) => {
        if (models.Student) {
            Certificate.belongsTo(models.Student, { foreignKey: "student_id", as: "student" });
        }
        if (models.Course) {
            Certificate.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
        }
        if (models.User) {
            Certificate.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
        }
    };

    return Certificate;
};
