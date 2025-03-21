const gameButton = document.getElementById("game-button");
const walletButton = document.getElementById("wallet-button");
const rectangle = document.getElementById("rectangle");
const walletPage = document.getElementById("wallet-page");

if (gameButton) {
    gameButton.addEventListener("click", () => {
        rectangle.style.display = "flex";
        walletPage.style.display = "none";
    });
}

if (walletButton) {
    walletButton.addEventListener("click", () => {
        rectangle.style.display = "none";
        walletPage.style.display = "block";
    });
}

// Створення шахової дошки
function createChessboard() {
    const board = document.querySelector(".board");
    const figures = [
        "♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜",
        "♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙",
        "♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"
    ];

    let index = 0;
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const square = document.createElement("div");
            square.classList.add("square");
            if ((rank + file) % 2 === 0) {
                square.classList.add("white");
            } else {
                square.classList.add("black");
            }
            board.appendChild(square);
            if (figures[index] !== "") {
                square.textContent = figures[index];
            }
            index++;
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    createChessboard(); // Викликаємо функцію після завантаження DOM
});
