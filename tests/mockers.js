class MockSheetAPI {
    constructor(initialData = null) {
        this.sheetData = []
        if (initialData) {
            this.sheetData = this.sheetData.concat(initialData)
        }
    }

    getAllData() {
        return this.sheetData.slice(1)
    }

    appendRow(rowData) {
        this.sheetData.push(rowData)
    }

    getColumnIndexMap() {
        let columnIndexMap = {}
        let header = this.sheetData[0];
        for (let i = 0; i < header.length; i++) {
            columnIndexMap[header[i]] = i;
        }
        return columnIndexMap
    }

    getColIdx(columnName) {
        return this.getColumnIndexMap()[columnName]
    }

    deleteAllRowsByColumnValue(columnName, value) {
        let colIdx = this.getColIdx(columnName)
        for (let index = this.sheetData.length - 1; index >= 1; index--) {
            let isMatch = this.sheetData[index][colIdx] === value
            if (isMatch) {
                this.deleteRowBySheetIdx(index)
            }
        }
    }

    deleteRowBySheetIdx(sheetIdx) {
        this.sheetData.splice(sheetIdx, 1)
    }
}

module.exports = { MockSheetAPI };
