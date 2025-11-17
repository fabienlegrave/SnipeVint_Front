export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<(R | null)[]> {
  const results = new Array<R | null>(items.length)
  let currentIndex = 0
  let activeWorkers = 0

  return new Promise((resolve, reject) => {
    const runNext = () => {
      if (currentIndex >= items.length && activeWorkers === 0) {
        return resolve(results)
      }

      while (activeWorkers < limit && currentIndex < items.length) {
        const index = currentIndex++
        activeWorkers++

        Promise.resolve(worker(items[index], index))
          .then(result => {
            results[index] = result
          })
          .catch(error => {
            results[index] = null
            console.warn(`⚠️ Worker ${index} error:`, error.message)
          })
          .finally(() => {
            activeWorkers--
            runNext()
          })
      }
    }

    runNext()
  })
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}