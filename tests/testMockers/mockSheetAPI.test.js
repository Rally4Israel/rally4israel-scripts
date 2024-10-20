const { MockSheetAPI } = require("../mockers")

test('initial data is empty list', () => {
    const sheetAPI = new MockSheetAPI()
    const data = sheetAPI.getAllData()
    expect(data).toStrictEqual([])
})

test('getAllData skips header row', () => {
    const sheetAPI = new MockSheetAPI(initialData = [["col1"], ["data1"]])
    const data = sheetAPI.getAllData()
    expect(data.length).toStrictEqual(1)
    expect(data[0][0]).toStrictEqual("data1")
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
    expect(sheetAPI.getAllData().length).toBe(1)
    sheetAPI.appendRow(["val 2a", "val 2b"])
    expect(sheetAPI.getAllData().length).toBe(2)
    let data = sheetAPI.getAllData()
    expect(data[0][0]).toStrictEqual("val 1a")
    expect(data[1][0]).toStrictEqual("val 2a")
})