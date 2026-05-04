// ════════════════════════════════════════════════════════
//  QUIZ QUESTIONS — import từ CSV "10 câu hỏi"
//  Đáp án đúng: 1B 2C 3A 4C 5C 6A 7A 8B 9D 10D
// ════════════════════════════════════════════════════════

const QUIZ_QUESTIONS = [
    {
        id: 1,
        question: "Trên thiệp cưới của Cô dâu chú rể có bao nhiêu con mèo?",
        options: [
            "5",
            "9",
            "10",
            "8"
        ],
        correct: 1,
        explanation: "Đúng rồi! Thiệp cưới có đúng 9 con mèo xinh xắn! 🐱"
    },
    {
        id: 2,
        question: "Năm sinh của Cô dâu chú rể là năm nào?",
        options: [
            "1992",
            "1994",
            "1993",
            "1993 & 1992"
        ],
        correct: 2,
        explanation: "Cô dâu chú rể đều sinh năm 1993! Cùng tuổi, cùng nhà! 🎂"
    },
    {
        id: 3,
        question: "Cô dâu chú rể đã quen biết nhau từ lúc nào?",
        options: [
            "Đại học",
            "Cấp 3",
            "Đi làm",
            "Gần đây"
        ],
        correct: 0,
        explanation: "Hai người quen nhau từ thời đại học! Duyên số từ giảng đường 🎓"
    },
    {
        id: 4,
        question: "Cô dâu chú rể đã chính thức bước vào mối quan hệ yêu đương được bao lâu?",
        options: [
            "3 năm",
            "4 năm",
            "5 năm",
            "6 năm"
        ],
        correct: 2,
        explanation: "5 năm yêu nhau ngọt ngào trước khi về chung một nhà! 💕"
    },
    {
        id: 5,
        question: "Họ tên đầy đủ của Cô dâu chú rể là gì?",
        options: [
            "Bùi Thị Mỹ Dung & Giang Tuấn Kiệt",
            "Dung Meo Meo & Staff 0đ",
            "Bùi Thị Mỹ Dung & Giang Minh Kiệt",
            "Bùi Thị Mỹ Duyên & Giang Minh Kiệt"
        ],
        correct: 2,
        explanation: "Chính xác! Bùi Thị Mỹ Dung & Giang Minh Kiệt! 🎊"
    },
    {
        id: 6,
        question: "Cô dâu chú rể thích màu gì?",
        options: [
            "Xanh Dương & Đen",
            "Vàng",
            "Đen Trắng",
            "Đỏ & Đen"
        ],
        correct: 0,
        explanation: "Xanh Dương & Đen — combo cực chill của cặp đôi! 💙🖤"
    },
    {
        id: 7,
        question: "Chú rể thích đội bóng nào?",
        options: [
            "Mân đàn",
            "Chân đèn",
            "Phú ngao",
            "Cần đò"
        ],
        correct: 0,
        explanation: "Đúng rồi! Chú rể là fan cứng của đội Mân đàn! ⚽"
    },
    {
        id: 8,
        question: "Cô dâu thích nhất bộ anime/manga nào?",
        options: [
            "Kimetsu no Yaiba",
            "Natsume Yuujinchou",
            "Mushishi",
            "Tensei Shitara Slime Datta Ken"
        ],
        correct: 1,
        explanation: "Natsume Yuujinchou — gu anime của cô dâu cực tinh tế! 🌿"
    },
    {
        id: 9,
        question: "Cô dâu & Chú rể mệnh gì?",
        options: [
            "Mệnh Kim và Mệnh Hỏa",
            "Mệnh Kim và Mệnh Thổ",
            "Mệnh Thổ",
            "Mệnh Kim"
        ],
        correct: 3,
        explanation: "Cả hai đều Mệnh Kim — kim cương bền vững mãi mãi! 💎"
    },
    {
        id: 10,
        question: "Cô dâu & Chú rể, ai là người biết nấu ăn?",
        options: [
            "Chú rể",
            "Cô dâu",
            "Cả 2 đều biết",
            "Cả 2 đều không"
        ],
        correct: 3,
        explanation: "Cả 2 đều không biết nấu — vậy là sẽ cùng nhau... gọi ship! 😂"
    }
];
