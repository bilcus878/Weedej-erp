export interface InventorySummary {
  productId:  string
  productName: string
  unit:       string
  physicalStock: number
  category?:  { id: string; name: string } | null
}

export interface InventuraItem {
  productId:   string
  productName: string
  unit:        string
  systemStock: number
  actualStock: string
  category?:   { id: string; name: string } | null
  checked:     boolean
}

export interface InventuraRecord {
  id:               string
  inventuraNumber:  string
  inventuraDate:    string
  totalProducts:    number
  checkedProducts:  number
  differencesCount: number
  surplusCount:     number
  shortageCount:    number
  status:           string
  note?:            string | null
}

export interface InventuraDetailItem {
  id:             string
  productId:      string
  productName:    string
  unit:           string
  category?:      string | null
  systemStock:    number
  actualStock:    number
  difference:     number
  differenceType: 'surplus' | 'shortage' | 'none'
}

export interface InventuraDetail {
  id:               string
  inventuraNumber:  string
  inventuraDate:    string
  totalProducts:    number
  checkedProducts:  number
  differencesCount: number
  surplusCount:     number
  shortageCount:    number
  status:           string
  note?:            string | null
  items:            InventuraDetailItem[]
}

export interface InventuraStats {
  total:       number
  checked:     number
  differences: number
  surpluses:   number
  shortages:   number
}
