const { MockSheetAPI } = require("../mockers")

test('initial data is empty list', () => {
    const sheetAPI = new MockSheetAPI()
    const records = sheetAPI.getAllRecords()
    expect(records).toStrictEqual([])
})

test('getAllRecords skips header row', () => {
    const sheetAPI = new MockSheetAPI(initialData = [["col1"], ["data1"]])
    const records = sheetAPI.getAllRecords()
    expect(records.length).toStrictEqual(1)
    expect(records[0][0]).toStrictEqual("data1")
})

test('getCoIdx returns index for column name', () => {
    const sheetAPI = new MockSheetAPI(initialData = [["col1", "col2"]])
    const col1Idx = sheetAPI.getColIdx('col1')
    const col2Idx = sheetAPI.getColIdx('col2')
    expect(col1Idx).toBe(0)
    expect(col2Idx).toBe(1)
})

test('appendRow adds row to sheetData', () => {
    const sheetAPI = new MockSheetAPI(initialData = [["col a", "col b"]])
    sheetAPI.appendRow(["val 1a", "val 1b"])
    expect(sheetAPI.getAllRecords().length).toBe(1)
    sheetAPI.appendRow(["val 2a", "val 2b"])
    expect(sheetAPI.getAllRecords().length).toBe(2)
    let records = sheetAPI.getAllRecords()
    expect(records[0][0]).toStrictEqual("val 1a")
    expect(records[1][0]).toStrictEqual("val 2a")
})

test('deleteAllRowsByColumnValue deletes all rows with the given value in the column', () => {
    const sheetAPI = new MockSheetAPI(initialData = [
        ["col a", "col b"],
        ["1", "2"],
        ["2", "1"],
        ["2", "3"]
    ])
    sheetAPI.deleteAllRowsByColumnValue("col a", "1")

    const records = sheetAPI.getAllRecords()
    expect(records.length).toStrictEqual(2)
    expect(records[0][1]).toStrictEqual("1")
    expect(records[1][1]).toStrictEqual("3")
})