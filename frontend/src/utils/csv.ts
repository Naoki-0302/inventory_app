// CSVファイルを出力する関数
export function downloadCsv(
    filename: string,
    header: string[],
    rows: string[][]
) {
    // ダブルクォーテーションをエスケープ
    const escapeCsv = (value: string) =>
        `"${value.replace(/"/g, '""')}"`;

    // CSV文字列を生成
    const csv = [header, ...rows]
        .map(row => row.map(escapeCsv).join(','))
        .join('\r\n');

    // CSVファイルを作成
    const blob = new Blob(['\uFEFF', csv], {
        type: 'text/csv;charset=utf-8;'
    });

    // ダウンロード
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}