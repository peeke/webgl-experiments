const makeLens = (typedArray, size, i) => j => ({
  get: () => typedArray[i * size + j],
  set: value => typedArray[i * size + j] = value
})

const makeLenses = (typedArray, properties) => {

  const size = properties.length
  const lenses = properties.reduce((result, property, i) => {
    result[property] = makeLens(typedArray, size, i)
    return result
  }, {})
  
  Object.assign(lenses, {
    forEach: fn => {
      const l = typedArray.length / size
      for (let i = 0; i < l; i++) {
        fn(
          i, 
          prop => lenses[prop](i).get(), 
          (prop, value) => lenses[prop](i).set(value)
        )
      }
    },
    get: (i, prop) => lenses[prop](i).get(),
    set: (i, prop, value) => lenses[prop](i).set(value)
  })

  return lenses
}

export { makeLens, makeLenses }