export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'slate',
    },
    input: {
      slots: {
        root: 'relative flex items-center',
      },
    },
    select: {
      slots: {
        base: [
          'relative group rounded-md flex items-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-75',
          'transition-colors',
        ],
      },
    },
  },
})
