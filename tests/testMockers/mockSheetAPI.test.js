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
