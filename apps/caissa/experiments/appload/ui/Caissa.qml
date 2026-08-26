pragma ComponentBehavior: Bound

import QtQuick 2.5

Rectangle {
    id: root
    objectName: "caissaRoot"

    width: parent ? parent.width : 702
    height: parent ? parent.height : 936
    color: "#f7f7f2"

    property int phase: 0
    property string selectedSquare: ""
    property string movedTo: ""
    property string message: "Tap the white pawn on e2."

    signal close

    function unloading() {
        resetPosition()
    }

    function squareName(squareIndex) {
        var files = "abcdefgh"
        var fileIndex = squareIndex % 8
        var rank = 8 - Math.floor(squareIndex / 8)
        return files.charAt(fileIndex) + rank
    }

    function pieceAt(square) {
        var file = square.charAt(0)
        var rank = Number(square.charAt(1))
        var backRank = "RNBQKBNR"
        var fileIndex = "abcdefgh".indexOf(file)

        if (phase === 2 && square === "e2")
            return ""
        if (phase === 2 && square === movedTo)
            return "wP"

        if (rank === 1)
            return "w" + backRank.charAt(fileIndex)
        if (rank === 2)
            return "wP"
        if (rank === 7)
            return "bP"
        if (rank === 8)
            return "b" + backRank.charAt(fileIndex)
        return ""
    }

    function handleSquareTap(square) {
        if (phase === 2) {
            message = "First move complete. Tap Reset to try again."
            return
        }

        if (phase === 0) {
            if (square === "e2") {
                selectedSquare = "e2"
                phase = 1
                message = "e2 selected. Tap e4."
            } else {
                message = "This test starts with the white pawn on e2."
            }
            return
        }

        if (square === "e2") {
            selectedSquare = ""
            phase = 0
            message = "Selection cleared. Tap e2 again."
        } else if (square === "e3" || square === "e4") {
            movedTo = square
            selectedSquare = ""
            phase = 2
            message = "Move accepted: e2-" + square + ". Black to move."
        } else {
            message = "Choose one of the marked squares: e3 or e4."
        }
    }

    function resetPosition() {
        phase = 0
        selectedSquare = ""
        movedTo = ""
        message = "Tap the white pawn on e2."
    }

    Rectangle {
        id: header
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: Math.max(104, parent.height * 0.12)
        color: "#f7f7f2"

        Text {
            anchors.left: parent.left
            anchors.leftMargin: Math.max(18, root.width * 0.035)
            anchors.top: parent.top
            anchors.topMargin: 14
            text: "CAISSA"
            color: "#111111"
            font.pixelSize: Math.max(30, Math.min(46, root.width * 0.065))
            font.bold: true
        }

        Text {
            anchors.left: parent.left
            anchors.leftMargin: Math.max(18, root.width * 0.035)
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 10
            text: "AppLoad interaction test · first move only"
            color: "#3a3a3a"
            font.pixelSize: Math.max(15, Math.min(22, root.width * 0.032))
        }

        Rectangle {
            id: closeButton
            objectName: "closeButton"
            anchors.right: parent.right
            anchors.rightMargin: Math.max(16, root.width * 0.03)
            anchors.verticalCenter: parent.verticalCenter
            width: Math.max(84, root.width * 0.16)
            height: Math.max(54, parent.height * 0.54)
            color: "#f7f7f2"
            border.color: "#111111"
            border.width: 3
            radius: 8

            Text {
                anchors.centerIn: parent
                text: "CLOSE"
                color: "#111111"
                font.pixelSize: Math.max(15, closeButton.height * 0.29)
                font.bold: true
            }

            MouseArea {
                anchors.fill: parent
                onClicked: root.close()
            }
        }
    }

    Rectangle {
        id: statusPanel
        anchors.top: header.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.leftMargin: Math.max(18, root.width * 0.035)
        anchors.rightMargin: Math.max(18, root.width * 0.035)
        height: Math.max(54, root.height * 0.065)
        color: root.phase === 2 ? "#deded7" : "#eeeeea"
        border.color: "#333333"
        border.width: 2
        radius: 6

        Text {
            id: statusText
            objectName: "statusText"
            anchors.fill: parent
            anchors.leftMargin: 12
            anchors.rightMargin: 12
            verticalAlignment: Text.AlignVCenter
            horizontalAlignment: Text.AlignHCenter
            text: root.message
            color: "#111111"
            font.pixelSize: Math.max(16, Math.min(24, root.width * 0.034))
            font.bold: true
            wrapMode: Text.WordWrap
        }
    }

    Rectangle {
        id: boardFrame
        objectName: "boardFrame"
        anchors.top: statusPanel.bottom
        anchors.topMargin: Math.max(12, root.height * 0.016)
        anchors.horizontalCenter: parent.horizontalCenter
        width: Math.min(root.width - Math.max(32, root.width * 0.07),
                        root.height - header.height - statusPanel.height
                        - Math.max(90, root.height * 0.11) - 46)
        height: width
        color: "#111111"
        border.color: "#111111"
        border.width: 4

        Grid {
            anchors.fill: parent
            anchors.margins: 4
            columns: 8
            rows: 8

            Repeater {
                model: 64

                Rectangle {
                    id: squareItem
                    required property int index
                    objectName: "square-" + square
                    width: (boardFrame.width - 8) / 8
                    height: (boardFrame.height - 8) / 8
                    color: ((Math.floor(index / 8) + index % 8) % 2 === 0) ? "#efefe8" : "#9b9b93"

                    property string square: root.squareName(index)
                    property string piece: root.pieceAt(square)
                    property bool whitePiece: piece.charAt(0) === "w"
                    property bool isSelected: root.selectedSquare === square
                    property bool isTarget: root.phase === 1 && (square === "e3" || square === "e4")
                    property bool isLastMove: root.phase === 2 && (square === "e2" || square === root.movedTo)

                    Rectangle {
                        anchors.fill: parent
                        anchors.margins: 3
                        color: "transparent"
                        border.color: squareItem.isSelected ? "#000000" : (squareItem.isLastMove ? "#2f2f2f" : "transparent")
                        border.width: squareItem.isSelected ? 6 : (squareItem.isLastMove ? 4 : 0)
                    }

                    Text {
                        anchors.left: parent.left
                        anchors.leftMargin: 3
                        anchors.top: parent.top
                        anchors.topMargin: 1
                        text: squareItem.square
                        color: ((Math.floor(squareItem.index / 8) + squareItem.index % 8) % 2 === 0) ? "#4b4b48" : "#202020"
                        font.pixelSize: Math.max(8, squareItem.width * 0.14)
                        font.bold: squareItem.square === "e2" || squareItem.square === "e4"
                    }

                    Rectangle {
                        id: pieceToken
                        visible: squareItem.piece !== ""
                        anchors.centerIn: parent
                        width: parent.width * 0.64
                        height: width
                        radius: width / 2
                        color: squareItem.whitePiece ? "#fafafa" : "#171717"
                        border.color: "#111111"
                        border.width: Math.max(2, parent.width * 0.035)

                        Text {
                            anchors.centerIn: parent
                            text: squareItem.piece.charAt(1)
                            color: squareItem.whitePiece ? "#111111" : "#ffffff"
                            font.pixelSize: Math.max(16, pieceToken.width * 0.48)
                            font.bold: true
                        }
                    }

                    Rectangle {
                        visible: squareItem.isTarget
                        anchors.centerIn: parent
                        width: parent.width * 0.26
                        height: width
                        radius: width / 2
                        color: "#111111"
                        border.color: "#f7f7f2"
                        border.width: Math.max(2, width * 0.12)
                    }

                    MouseArea {
                        anchors.fill: parent
                        onClicked: root.handleSquareTap(squareItem.square)
                    }
                }
            }
        }
    }

    Item {
        id: controls
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        height: Math.max(90, root.height * 0.11)

        Text {
            anchors.left: parent.left
            anchors.leftMargin: Math.max(18, root.width * 0.035)
            anchors.right: resetButton.left
            anchors.rightMargin: 14
            anchors.verticalCenter: parent.verticalCenter
            text: root.phase === 0 ? "1  Tap e2" : (root.phase === 1 ? "2  Tap e4" : "PASS  e2-e" + root.movedTo.charAt(1))
            color: "#111111"
            font.pixelSize: Math.max(19, Math.min(30, root.width * 0.043))
            font.bold: true
            wrapMode: Text.WordWrap
        }

        Rectangle {
            id: resetButton
            objectName: "resetButton"
            anchors.right: parent.right
            anchors.rightMargin: Math.max(18, root.width * 0.035)
            anchors.verticalCenter: parent.verticalCenter
            width: Math.max(128, root.width * 0.27)
            height: Math.max(58, Math.min(86, parent.height * 0.68))
            color: "#111111"
            radius: 8

            Text {
                anchors.centerIn: parent
                text: "RESET"
                color: "#ffffff"
                font.pixelSize: Math.max(17, resetButton.height * 0.3)
                font.bold: true
            }

            MouseArea {
                anchors.fill: parent
                onClicked: root.resetPosition()
            }
        }
    }
}
