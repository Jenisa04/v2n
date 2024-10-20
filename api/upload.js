export default function handler(req, res) {
  if (req.method === 'POST') {
    // Handle the file upload here
    // Access the file using req.body or a library like 'formidable' to parse it.
    res.status(200).json({ message: 'File uploaded successfully!' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
