document.addEventListener("DOMContentLoaded", function() {
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
                square.textContent = figures
