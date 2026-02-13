/**
 * Sanitize string to prevent XSS attacks
 */
function sanitize(string) {
  const escapeTags = (str) => {
    // Remove all HTML tags
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\${([^}]*)}/g, '$1');
  };

  const removeExtraSpaces = (str) => {
    // Remove all extra spaces
    return str.replace(/\s+/g, ' ').trim();
  };

  // Return the string
  if (string && typeof string === 'string') {
    let sanitizedString = escapeTags(string);
    sanitizedString = removeExtraSpaces(sanitizedString);
    return sanitizedString;
  } else {
    return string;
  }
}

module.exports = { sanitize };
