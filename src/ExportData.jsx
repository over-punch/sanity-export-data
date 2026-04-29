// Component for exporting Sanity documents to CSV or JSON format
import { Stack, Card, Grid, Heading, Text, Button, TextInput, Select, Box, Checkbox, Radio, Label } from '@sanity/ui'
import { DownloadIcon, CollapseIcon, ExpandIcon } from '@sanity/icons'
import { useState, useEffect } from 'react'

/**
 * Export Data Component
 * Exports Sanity documents to CSV or JSON format with optional reference population
 * @param {Object} props - Component props
 * @param {SanityClient} props.client - Sanity client instance
 */
const ExportData = (props) => {
	const {client, icon: Icon, displayName} = props;
	const [searchDataValue, setSearchDataValue] = useState('');
	const [searchDataType, setSearchDataType] = useState('typeface');
	const [searchData, setSearchData] = useState([]);
	const [searchDataMessage, setSearchDataMessage] = useState('');
	const [references, setReferences] = useState({});
	const [loading, setLoading] = useState(false);
	const [excludeValue, setExcludeValue] = useState('');
	const [exclude, setExclude] = useState(false);
	const [exportFormat, setExportFormat] = useState('csv');

	useEffect(() => {
		if (!exclude) setExcludeValue("");
	}, [exclude]);

	async function searchForItems() {
		try {
			let queryString = `
				*[
					_type == "${searchDataType}"
					&& title match "${searchDataValue}*"
					${excludeValue !== "" ? ` && !(title match "*${excludeValue}*")` : ""}
					&& !(_id in path('drafts.**'))
				]
			`
			setLoading(true);
			const items = await client.fetch(queryString)
			setSearchData(items)

			let firstLevelReferences = [];
			items.forEach(item => {
				// Check the first level
				Object.keys(item).forEach(key => {
					let keyTitle;

					// checking for references
					if (item[key]?._ref) {
						firstLevelReferences.push(key)
						keyTitle = key;
					}

					// checking for arrays of references
					if (typeof item[key] === 'object' && !!item[key] && item[key][0]?._ref) {
						firstLevelReferences.push(`${key}[]`)
						keyTitle = `${key}[]`;
					}
				})
			})
			firstLevelReferences = firstLevelReferences.filter((value, index, self) => self.indexOf(value) === index);
			firstLevelReferences.sort();

			let firstLevelReferencesObject = {};
			firstLevelReferences.forEach(reference => {
				firstLevelReferencesObject[reference] = false;
			});

			setReferences(firstLevelReferencesObject)
			setLoading(false);
		} catch (e) {
			console.error(e);
			setSearchDataMessage('Error: ' + e.message);
		}
	}

	useEffect(() => {
		searchForItems()
	}, [searchDataValue, searchDataType])

	function exportData(){
		try {
			let content, mimeType, fileExtension;

			if (exportFormat === 'json') {
				// JSON export
				const jsonString = JSON.stringify(searchData, null, 2);
				content = "data:application/json;charset=utf-8," + encodeURIComponent(jsonString);
				fileExtension = 'json';
			} else {
				// CSV export
				let csvContent = "data:text/csv;charset=utf-8,";
				let headers = [];
				let rows = [];
				let row = [];

				// get each unique key from all items in array
				let keys = searchData.map(item => Object.keys(item))
					.flat()
					.filter((value, index, self) => self.indexOf(value) === index);

				keys.forEach((key) => {
					headers.push(key);
				});

				rows.push(headers.join(","));
				searchData.forEach((item) => {
					row = [];
					keys.forEach((key) => {
						let value = item[key];
						if (typeof value === 'object') {
							value = `"${JSON.stringify(value).replace(/\"/g, "\"\"")}"`;
						} else if (typeof value === 'string') {
							value = value.replace(/"/g, '""');
							value = `"${value}"`;
						}
						row.push(value);
					});
					rows.push(row.join(","));
				});

				content = csvContent + encodeURIComponent(rows.join("\n"));
				fileExtension = 'csv';
			}

			let link = document.createElement("a");
			link.setAttribute("href", content);
			link.setAttribute("download", `${searchDataType}${searchDataValue ? `-${searchDataValue}` : ""}-${new Date().toLocaleDateString('en-US')}.${fileExtension}`);
			document.body.appendChild(link);
			link.click();

		} catch (e) {
			console.error(e);
			setSearchDataMessage('Error: ' + e.message);
		}
	}

	const handleReferenceChange = (reference) => {
		setReferences({
			...references,
			[reference]: !references[reference]
		});
	}

	const selectAllReferences = () => {
		const allSelected = {};
		Object.keys(references).forEach(key => {
			allSelected[key] = true;
		});
		setReferences(allSelected);
	}

	const deselectAllReferences = () => {
		const allDeselected = {};
		Object.keys(references).forEach(key => {
			allDeselected[key] = false;
		});
		setReferences(allDeselected);
	}

	async function getReferences() {
		try {
			setLoading(true);
			let queryString = `*[_type == "${searchDataType}" && title match "${searchDataValue}*" && !(_id in path('drafts.**'))]`
			if (Object.values(references).includes(true)) {
				queryString += `{...`

				Object.keys(references).forEach((reference, index) => {
					if (references[reference]) queryString += `, "${reference.replace("[]", "")}": ${reference}->{...}`
				})
				queryString += `}`
			}

			const items = await client.fetch(queryString)
			setSearchData(items);
			setLoading(false);
		} catch (e) {
			console.error(e);
			setSearchDataMessage('Error: ' + e.message);
		}
	}

	useEffect(() => {
		getReferences();
	}, [references])

	return (
		<>
			<Stack style={{paddingTop: "4em", paddingBottom: "2em", position: "relative"}}>
				<Heading as="h3" size={3}>{Icon && <Icon style={{display: 'inline-block', marginRight: '0.35em', opacity: 0.5, transform: 'translateY(2px)'}} />}{displayName}</Heading>
				<Text muted size={1} style={{paddingTop: "2em", maxWidth: "calc(100% - 100px)"}}>
					Search for documents by name and type, then export them to CSV or JSON. Optionally populate referenced documents for more complete data exports.
				</Text>
				<div style={{position: "absolute", bottom: "1.5em", right: "0"}}>
					<Button
						mode={exclude?"ghost":"bleed"}
						tone="positive"
						icon={exclude?CollapseIcon:ExpandIcon}
						onClick={() => { setExclude(!exclude) }}
						style={{cursor: "pointer", marginLeft: ".5em"}}
					/>
				</div>
			</Stack>
			<Stack style={{ position: "relative" }} >
				<Grid columns={exclude ? [3] : [2]} gap={0} style={{position: "relative"}}>
					<TextInput
						style={{
							borderRadius: "3px 0 0 0",
						}}
						onChange={(event) => { setSearchDataValue(event.currentTarget.value) }}
						placeholder="Name"
						value={searchDataValue}
					/>
					{!!exclude &&
						<TextInput
							style={{
								display: exclude ? "" : "none",
							}}
							onChange={(event) => { setExcludeValue(event.currentTarget.value) }}
							placeholder="Excluding"
							value={excludeValue}
						/>
					}
					<Select
						style={{
							borderRadius: "0 3px 0 0",
						}}
						onChange={(event) => { setSearchDataType(event.currentTarget.value) }}
						value={searchDataType}
					>
						<option value="typeface">Typeface</option>
						<option value="collection">Collection</option>
						<option value="pair">Pair</option>
						<option value="font">Font</option>
						<option value="license">License</option>
						<option value="order">Order</option>
						<option value="account">Account</option>
						<option value="cart">Cart</option>
						<option value="page">Page</option>
						<option value="blogpost">Blogpost</option>
					</Select>
				</Grid>
			</Stack>

			{searchData.length && Object.keys(references).length ? (
				<Stack>
					<Card padding={4} tone="transparent" border={1} borderTop={0}>
						<Heading as="h5" size={1}>Populate References</Heading>
						<br/>
						<Stack space={2}>
							<Grid columns={[2]} gap={2}>
								<Button
									text="Select All"
									mode="ghost"
									fontSize={1}
									padding={2}
									onClick={selectAllReferences}
									style={{cursor: "pointer"}}
								/>
								<Button
									text="Deselect All"
									mode="ghost"
									fontSize={1}
									padding={2}
									onClick={deselectAllReferences}
									style={{cursor: "pointer"}}
								/>
							</Grid>
						</Stack>
						<br/>
						<Grid columns={[2]} gap={1}>
							{Object.keys(references).map((reference, index) => (
								<div key={`reference-${index}`} >
									<Checkbox id={`${reference}`} checked={references[reference]} onChange={() => handleReferenceChange(reference)}/>
									<Box flex={1} paddingLeft={3} style={{display: "inline-block", transform: "translate(0, -10px)"}}>
										<Text><label htmlFor={`${reference}`}>{reference}</label></Text>
									</Box>
								</div>
							))}
						</Grid>
					</Card>
				</Stack>
			): ''}

			{searchData.length ? (
				<Stack>
					<Card padding={3} tone="transparent" border={1} style={{marginTop: ".5em"}}>
						<Stack space={3}>
							<Heading as="h5" size={1}>Export Format</Heading>
							<Grid columns={[2]} gap={2}>
								<Box>
									<Radio
										id="format-csv"
										name="exportFormat"
										checked={exportFormat === 'csv'}
										onChange={() => setExportFormat('csv')}
										style={{display: 'inline-block'}}
									/>
									<Box paddingLeft={2} style={{display: 'inline-block', transform: 'translate(0, -2px)'}}>
										<Label htmlFor="format-csv" style={{cursor: 'pointer'}}>CSV</Label>
									</Box>
								</Box>
								<Box>
									<Radio
										id="format-json"
										name="exportFormat"
										checked={exportFormat === 'json'}
										onChange={() => setExportFormat('json')}
										style={{display: 'inline-block'}}
									/>
									<Box paddingLeft={2} style={{display: 'inline-block', transform: 'translate(0, -2px)'}}>
										<Label htmlFor="format-json" style={{cursor: 'pointer'}}>JSON</Label>
									</Box>
								</Box>
							</Grid>
						</Stack>
					</Card>
					<Button
						style={{
							borderRadius: "3px",
							marginTop: ".5em",
							textAlign: "center",
							cursor: loading ? "" : "pointer",
						}}
						flex={1}
						disabled={loading}
						onClick={() => { exportData() }}
						text={`Export ${exportFormat.toUpperCase()}`}
						icon={DownloadIcon}
					/>
				</Stack>
			): ''}

			{searchDataMessage!="" && (
				<Stack>
					<p style={{padding: ".5em 0em 1em", opacity: "0.75"}} dangerouslySetInnerHTML={{__html: searchDataMessage}}></p>
				</Stack>
			)}

			{searchData.length > 0 && (
				<Stack>
					<div
						style={{
							maxHeight: "400px",
							marginTop: "5px",
							border: "1px solid rgba(255,255,255,0.1)",
							overflow: "auto",
							paddingBottom: "1rem",
							borderRadius: "3px",
						}}
					>
						{searchData.map((item, index) => (
							<a
								target="_blank"
								key={`item-${index}`}
								className="link"
								href={`${window.location.origin}/desk/${(searchDataType === "typeface" || searchDataType === "licenseGroup") ? "orderable-" : ""}${searchDataType};${item._id}`}
							>
								<Stack>
									<Text size={1} style={{padding: "1em 1em .5em"}}>{item?.slug?.current ? item?.slug?.current : item?.title}</Text>
								</Stack>
							</a>
						))}
					</div>
					<div style={{pointerEvents: "none", textAlign: "right", top: "-30px", paddingRight: "10px", position: "relative", height: "30px"}}>{searchData.length} items</div>
				</Stack>
			)}
		</>
	)
}

export default ExportData
