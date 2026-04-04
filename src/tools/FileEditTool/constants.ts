// In its own file to avoid circular dependencies
export const FILE_EDIT_TOOL_NAME = 'Edit'

// Permission pattern for granting session-level access to the project's .mycode/ folder
export const MYCODE_FOLDER_PERMISSION_PATTERN = '/.mycode/**'

// Permission pattern for granting session-level access to the global ~/.mycode/ folder
export const GLOBAL_MYCODE_FOLDER_PERMISSION_PATTERN = '~/.mycode/**'

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
