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

}

module.exports = { MockSheetAPI };
